import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface S3BucketArgs {
  bucketName: pulumi.Input<string>;
}

export class S3Bucket extends pulumi.ComponentResource {
  public postgresBackupBucket: aws.s3.Bucket;

  constructor(
    name: string,
    args: S3BucketArgs,
    opts: pulumi.ComponentResourceOptions
  ) {
    super("pkg:eks:s3bucket", name, {}, opts);

    //create the s3 bucket for backups
    this.postgresBackupBucket = new aws.s3.Bucket("readonly-backup", {
      bucket: args.bucketName,
      forceDestroy: true,
    });

    this.registerOutputs({
      bucketName: this.postgresBackupBucket.arn,
    });

    const exampleBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      "example",
      {
        bucket: this.postgresBackupBucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }
    );

    //create public policy for bucket
    const allowReadAccess = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          effect: "Allow",
          principals: [
            {
              type: "AWS",
              identifiers: ["*"],
            },
          ],
          actions: ["s3:GetObject", "s3:ListBucket"],
          resources: [
            this.postgresBackupBucket.arn,
            pulumi.interpolate`${this.postgresBackupBucket.arn}/*`,
          ],
        },
      ],
    });

    const allowAccessFromAnotherAccountBucketPolicy = new aws.s3.BucketPolicy(
      "allow_public_access",
      {
        bucket: this.postgresBackupBucket.id,
        policy: allowReadAccess.apply(
          (allowReadAccess) => allowReadAccess.json
        ),
      }
    );
  }
}
