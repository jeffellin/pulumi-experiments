import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Service } from "@pulumi/kubernetes/core/v1/service";

export interface WebDeploymentArgs {
    provider?: k8s.Provider
    namespaceName?: pulumi.Input<string>;
    appLabels?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
}

export class WebDeployment extends pulumi.ComponentResource {
    constructor(name: string, args: WebDeploymentArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:index:MyComponent", name, {}, opts);

        const namespaceName = args.namespaceName
        const appLabels = args.appLabels
        const service = new Service(name,{
            metadata: {
                namespace: namespaceName,
                labels: appLabels,
            }, 
            spec: {
                ports: [{ port: 8080, targetPort: "http" }], 
                type: "LoadBalancer",
                selector: appLabels
            },

        },
        {
            provider: args.provider,
        })
        const deployment = new k8s.apps.v1.Deployment(name,
            {
                metadata: {
                    namespace: namespaceName,
                    labels: appLabels,
                },
                spec: {
                    replicas: 1,
                    selector: { matchLabels: appLabels },
                    template: {
                        metadata: {
                            labels: appLabels,
                        },
                        spec: {
                            containers: [
                                {
                                    name: name,
                                    image: "nginx:latest",
                                    ports: [{ name: "http", containerPort: 80 }]
                                }
                            ],
                        }
                    }
                },
            },
             {
                 provider: args.provider,
             }
        );
    }
}