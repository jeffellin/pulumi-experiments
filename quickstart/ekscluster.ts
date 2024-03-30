import * as pulumi from "@pulumi/pulumi";
import * as k8s from '@pulumi/kubernetes'
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";


export interface EKSClusterArgs {
    namespaceName?: pulumi.Input<string>;
    eksVpc: pulumi.Input<awsx.ec2.Vpc>;
    eksNodeInstanceType: pulumi.Input<string>;
    desiredClusterSize: pulumi.Input<number>;
    minClusterSize: pulumi.Input<number>;
    maxClusterSize: pulumi.Input<number>;
    appsNamespaceName: pulumi.Input<string>

}

export class EKSCluster extends pulumi.ComponentResource {

    constructor(name: string, args: EKSClusterArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:eks:Irmsa", name, {}, opts);
    //unwrap the argument
    const eksVPC = pulumi.output(args.eksVpc);
        // Create the EKS cluster
    const cluster = new eks.Cluster("eks-cluster", {
        // Put the cluster in the new VPC created earlier
        vpcId: eksVPC.vpcId,
        // Public subnets will be used for load balancers
        publicSubnetIds: eksVPC.publicSubnetIds,
        // Private subnets will be used for cluster nodes
        privateSubnetIds: eksVPC.privateSubnetIds,
        // Change configuration values to change any of the following settings
        instanceType: args.eksNodeInstanceType,
        desiredCapacity: args.desiredClusterSize,
        minSize: args.minClusterSize,
        maxSize: args.maxClusterSize,
        // Do not give the worker nodes public IP addresses
        nodeAssociatePublicIpAddress: false,
        // Change these values for a private cluster (VPN access required)
        endpointPrivateAccess: false,
        endpointPublicAccess: true,
        createOidcProvider: true
    });

    if (cluster?.core?.oidcProvider) {
    //
        const namespace = new k8s.core.v1.Namespace('wiz', {}, {});
        const clusterOidcProvider = cluster.core.oidcProvider;
        const clusterOidcProviderUrl = clusterOidcProvider.url;
    //    // Create the new IAM policy for the Service Account using the AssumeRoleWebWebIdentity action.
        const saName = 's3'

        const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProvider.arn, args.appsNamespaceName]).apply(([url, arn, namespace]) => aws.iam.getPolicyDocument({
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
 });

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
    {  });
 //   this.oidcName = cluster.core.oidcProvider.arn

    }
  

//  this.registerOutputs({
//      oidcName: cluster.core.oidcProvider?.arn
//  })   
//  }

  
//  public readonly oidcName: pulumi.Output<string>;

}
}
