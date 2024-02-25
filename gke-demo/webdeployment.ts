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


    public readonly url: pulumi.Output<string>;


    constructor(name: string, args: WebDeploymentArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:index:MyComponent", name, {}, opts);

        const namespaceName = args.namespaceName
        const appLabels = args.appLabels

        const cfg = new pulumi.Config();
        const greeting = cfg.get("greeting") || "not set";
        
        const service = new Service(name,{
            metadata: {
                namespace: namespaceName,
                labels: appLabels,
            }, 
            spec: {
                ports: [{ port: 80, targetPort: "http" }], 
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
                                    image: "docker.io/ellinj/pulumi-demo:0.0.1-SNAPSHOT",
                                    ports: [{ name: "http", containerPort: 8080 }],
                                    env: [{name: "GREETING", value: greeting}]
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
        this.url = service.status.loadBalancer.ingress[0].ip
        
        this.registerOutputs({
            bucketDnsName: service.status.loadBalancer.ingress[0].ip,
        }) 
    }
    
}

