import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
const config = new pulumi.Config();
const vpcNetworkCidr = config.get("vpcNetworkCidr") || "10.0.0.0/16";

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: vpcNetworkCidr,
});    

//create the s3 bucket for backups
const postgresBackupBucket = new aws.s3.Bucket("jellin-aws-pg-backup",{
    bucket: "jellin-aws-pg-backup",
    
})




const exampleBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("example", {
    bucket: postgresBackupBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

//create public policy for bucket
const allowReadAccess = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        principals: [{
            type: "AWS",
            identifiers: ["*"],
        }],
        actions: [
            "s3:GetObject",
            "s3:ListBucket",
        ],
        resources: [
            postgresBackupBucket.arn,
            pulumi.interpolate`${postgresBackupBucket.arn}/*`,
        ],
    }],
});

const allowAccessFromAnotherAccountBucketPolicy = new aws.s3.BucketPolicy("allow_access_from_another_account", {
    bucket: postgresBackupBucket.id,
    policy: allowReadAccess.apply(allowReadAccess => allowReadAccess.json),
});

// Create an AWS resource (EC2 Security Group)
const group = new aws.ec2.SecurityGroup("web-secgrp", {
    vpcId: eksVpc.vpcId,
    ingress: [
        // SSH access from anywhere.
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        // HTTP access from anywhere.
        { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["10.0.0.0/16"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ]
});

//create the instance profile to access the bucket

const ec2Role = new aws.iam.Role("ec2Role", {
    assumeRolePolicy: `{
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Principal": {"Service": "ec2.amazonaws.com"},
            "Effect": "Allow",
            "Sid": ""
        }]
    }`
});


// Define a policy document that allows writing logs to CloudWatch
const policyDocument = aws.iam.getPolicyDocumentOutput({
    statements: [{
        actions: [
            "s3:*"
        ],
        resources: ["*"],
        effect: "Allow"
    }]
});

// Create an IAM Policy based on the policy document
const ec2Policy = new aws.iam.Policy("ec2Policy", {
    policy: policyDocument.apply(policyDocument => policyDocument.json),
});

// Attach the policy to the IAM role
const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("rolePolicyAttachment", {
    role: ec2Role.name,
    policyArn: ec2Policy.arn,
});

// Create an IAM Instance Profile and pass the role information
const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
    role: ec2Role.name
});


const ubuntu = aws.ec2.getAmi({
    mostRecent: true,
    filters: [
        {
            name: "name",
            values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
        },
        {
            name: "virtualization-type",
            values: ["hvm"],
        },
    ],
    owners: ["099720109477"],
});

const cloud_init_data = `#cloud-config
package_update: true
packages:
  - postgresql
  - s3cmd
write_files:
  - path: /usr/bin/backup.sh
    content: |
      pg_dump -v --format=c -h localhost -U bookstore demo > backup.dump
      s3cmd put backup.dump s3://jellin-aws-pg-backup 

runcmd:
  - |
    sudo -u postgres psql << SQL
      CREATE USER bookstore with PASSWORD 'bookstore';
    SQL
  - |
    sudo -u postgres psql <<SQL
      CREATE DATABASE demo;
    SQL
  - |
    sudo -u postgres psql <<SQL
      ALTER DATABASE demo owner to bookstore;
    SQL
  - echo "listen_addresses = '*'" >> /etc/postgresql/14/main/postgresql.conf
  - echo "host    all    all       0.0.0.0/0   scram-sha-256" >> /etc/postgresql/14/main/pg_hba.conf
  - service postgresql restart
`;

const postgres = new aws.ec2.Instance("postgres", {
    subnetId: eksVpc.publicSubnetIds[0], // Choose the public subnet from the created VPC
    keyName: "jellin",
    vpcSecurityGroupIds: [group.id],
    ami: ubuntu.then(ubuntu => ubuntu.id),
    instanceType: aws.ec2.InstanceType.T3_Micro,
    userData: cloud_init_data,
    tags: {
        Name: "postgres-server",
    },
    iamInstanceProfile: instanceProfile.name
});

export const instancePublicIp = postgres.publicIp;
