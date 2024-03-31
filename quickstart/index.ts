import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import {WebDeployment} from "./webdeployment"
import {WebDatabase} from "./webdatabase"
import {EKSCluster} from "./ekscluster"
import {S3Bucket} from "./s3bucket"


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

const webApp = new WebDeployment("web-deploy",{appLabels: appLabels,namespaceName:eksCluster.nameSpaceName,pgHost: postgresDB.postrgresInstance.publicDns,pgPassword:'bookstore',pgUser:'bookstore'},{})

export const url = backupBucket.postgresBackupBucket.arn
export const pgHost = postgresDB.postrgresInstance.publicDns

//export const url = pulumi.all([wd.serviceURL]).
//    apply(([hostname, port]) => `http://${hostname}/greeting`);


