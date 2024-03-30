import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

export interface WebDatabaseArgs {
    namespaceName?: pulumi.Input<string>;
    eksVpc: awsx.ec2.Vpc;

}

export class WebDatabase extends pulumi.ComponentResource {
    public postrgresInstance: aws.ec2.Instance;

    constructor(name: string, args: WebDatabaseArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:spring:WebDatabase", name, {}, opts);

        // Create an AWS resource (EC2 Security Group)
    const group = new aws.ec2.SecurityGroup("web-secgrp", {
    vpcId: args.eksVpc.vpcId,
    ingress: [
        // SSH access from anywhere.
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        // HTTP access from anywhere.
        { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] },
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

/** 
//  - owner: root:root
//    path: /etc/cron.d/your_cronjob
//    content: "* */2 //* * * postgres du -s njain"
//@hourly /opt/bin/check-routers
//
const cloud_init_data = `#cloud-config
package_update: true
packages:
  - postgresql
  - s3cmd
write_files:
  - owner: root:root
    path: /etc/cron.d/your_cronjob
    content: '@hourly postgres /usr/bin/backup.sh'
  - path: /usr/bin/backup.sh
    permissions: '0755'
    content: |
      #!/bin/bash -x
      export PGPASSWORD=bookstore
      current_time=$(date "+%Y.%m.%d-%H.%M.%S")
      new_fileName=/tmp/backup.dump.$current_time
      pg_dump -v --format=c -h localhost -U bookstore demo > $new_fileName
      s3cmd put $new_fileName s3://jeff-pg-backup-2024 

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

 this.postrgresInstance = new aws.ec2.Instance("postgres", {
    subnetId: args.eksVpc.publicSubnetIds[0], // Choose the public subnet from the created VPC
    keyName: "jellin",
    vpcSecurityGroupIds: [group.id],
    ami: ubuntu.then(ubuntu => ubuntu.id),
    instanceType: aws.ec2.InstanceType.T3_Micro,
    userData: cloud_init_data,
    tags: {
        Name: "postgres-server",
    },
    iamInstanceProfile: instanceProfile.name
},{replaceOnChanges:["userData"]});

this.registerOutputs({
    postrgresInstance: this.postrgresInstance
});


    }


    
    
}

