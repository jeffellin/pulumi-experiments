import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import {WebDeployment} from "./webdeployment"
import {WebDatabase} from "./webdatabase"
import {EKSCluster} from "./ekscluster"
import {S3Bucket} from "./s3bucket"
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";


const config = new pulumi.Config();
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";
const minClusterSize = config.getNumber("minClusterSize") || 3;
const maxClusterSize = config.getNumber("maxClusterSize") || 6;
const desiredClusterSize = config.getNumber("desiredClusterSize") || 3;
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: vpcNetworkCidr,
});    

//create the EKS Cluster

const eksCluster = new EKSCluster("demo-eks",{
    namespaceName: "demo",
    eksVpc: eksVpc,
    eksNodeInstanceType: eksNodeInstanceType,
    minClusterSize: minClusterSize,
    maxClusterSize: maxClusterSize,
    desiredClusterSize: desiredClusterSize,
    appsNamespaceName: "apps"
},{})

//create the S3 Bucket
const backupBucket = new S3Bucket("backup-bucket",{bucketName:"jeff-pg-backup-2024"},{})
//create the Postgres Database
const postgresDB = new WebDatabase("web-database",{
    eksVpc:eksVpc
    },{})
//deploy application to cluster
const appLabels = {
    app: "nginx",
};

const webApp = new WebDeployment("web-deploy",{appLabels: appLabels,namespaceName:"default",pgHost: postgresDB.postrgresInstance.publicDns,pgPassword:'bookstore',pgUser:'bookstore'},{})

export const url = backupBucket.postgresBackupBucket.arn
export const pgHost = postgresDB.postrgresInstance.publicDns







//const oidc = eksCluster.core.oidcProvider//
//const appLabels = {
//    app: "nginx",
//};
//const namespace = "demo"

//const clusterKubeconfig = eksCluster.kubeconfig;

//const provider = new k8s.Provider("gcp-k8s-provider", {kubeconfig: clusterKubeconfig});

//const ns = new k8s.core.v1.Namespace(namespace, {}, { provider: provider, dependsOn: eksCluster });

//export const namespaceName = ns.metadata.apply(m => m.name);


//const wd = new WebDeployment("test-deployment",{
//    appLabels: appLabels,
//    namespaceName: namespaceName
//},{dependsOn: ns, provider:provider} )



//export const url = pulumi.all([wd.serviceURL]).
//    apply(([hostname, port]) => `http://${hostname}/greeting`);


//export const instancePublicIp = postgres.publicIp;
