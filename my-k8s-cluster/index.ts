import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from '@pulumi/kubernetes'
import { S3Bucket } from "./s3bucket"
import { WebDatabase } from "./webdatabase"
import { WebDeployment } from "./webdeployment"

// Grab some values from the Pulumi configuration (or use default values)
const config = new pulumi.Config();
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: vpcNetworkCidr,
});

// Create the EKS cluster
//create the EKS Cluster
const eksCluster = new eks.Cluster("eks-cluster", {
    // Put the cluster in the new VPC created earlier
    vpcId: eksVpc.vpcId,
    // Public subnets will be used for load balancers
    publicSubnetIds: eksVpc.publicSubnetIds,
    // Private subnets will be used for cluster nodes
    privateSubnetIds: eksVpc.privateSubnetIds,
    // Change configuration values to change any of the following settings
    instanceType: eksNodeInstanceType,
    desiredCapacity: desiredClusterSize,
    minSize: minClusterSize,
    maxSize: maxClusterSize,
    // Do not give the worker nodes public IP addresses
    nodeAssociatePublicIpAddress: false,
    // Change these values for a private cluster (VPN access required)
    endpointPrivateAccess: false,
    endpointPublicAccess: true,
    createOidcProvider: true
});
const provider = new k8s.Provider("k8s-provider", { kubeconfig: eksCluster.kubeconfig });
const namespace = new k8s.core.v1.Namespace("wiz", {}, { provider: provider });

if (eksCluster?.core?.oidcProvider) {



    const clusterOidcProvider = eksCluster.core.oidcProvider;
    const clusterOidcProviderUrl = clusterOidcProvider.url;
   // Create the new IAM policy for the Service Account using the AssumeRoleWebWebIdentity action.
    const saName = 'wiz-sa'

    const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProvider.arn, "wiz"]).apply(([url, arn, namespace]) => aws.iam.getPolicyDocument({
        statements: [{
            actions: ["sts:AssumeRoleWithWebIdentity"],
            conditions: [{
                test: "StringEquals",
                values: [`system:serviceaccount:${namespace}:${saName}`],
                variable: `${url.replace("https://", "")}:sub`,
            }],
            effect: "Allow",
            principals: [{
                identifiers: [arn],
                type: "Federated",
            }],
        }],
    }));

    // Create a new IAM role that assumes the AssumeRoleWebWebIdentity policy.
    const saRole = new aws.iam.Role(saName, {
        assumeRolePolicy: saAssumeRolePolicy.json,
    },);

    const saS3Rpa = new aws.iam.RolePolicyAttachment(saName, {
        policyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
        role: saRole,
    });

    const sa = new k8s.core.v1.ServiceAccount(
        saName,
        {
            metadata: {
                namespace: namespace.metadata.name,
                name: saName,
                annotations: {
                    'eks.amazonaws.com/role-arn': saRole.arn,
                },
            },
        },
        { provider: provider });

    // Create a new ClusterRoleBinding resource, to give the new service account admin
    // access
    const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("example-clusterrolebinding", {
        metadata: {
            name: "wiz-admin", // Name of the ClusterRoleBinding
        },
        roleRef: {
            apiGroup: "rbac.authorization.k8s.io", // API group for RBAC
            kind: "ClusterRole", // Kind is 'ClusterRole'
            name: "cluster-admin", // Name of the ClusterRole to bind to
        },
        subjects: [
            {
                kind: "ServiceAccount", // Can be 'User', 'Group', or 'ServiceAccount'
                name: sa.metadata.name, // Name of the user or group
                namespace: namespace.metadata.name,
            },
        ],
    },{provider:provider});


}


//create the s3 bucket
const backupBucket = new S3Bucket("backup-bucket", { bucketName: "jeff-pg-backup-2024-06" }, {})
//create the Postgres Database
const postgresDB = new WebDatabase("web-database", {
    eksVpc: eksVpc
}, {})

const appLabels = {
    app: "nginx",
};

const webApp = new WebDeployment("web-deploy", { appLabels: appLabels, namespaceName: namespace.metadata.name, pgHost: postgresDB.postrgresInstance.publicDns, pgPassword: 'bookstore', pgUser: 'bookstore' }, { provider: provider })

export const bucket = backupBucket.postgresBackupBucket.arn
export const serviceURL = pulumi.interpolate`http://${webApp.serviceURL}`
export const pgHost = postgresDB.postrgresInstance.publicDns
export const vpcId = eksVpc.vpcId;
export const clusterName = eksCluster.eksCluster.name

