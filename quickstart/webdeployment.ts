import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Service } from "@pulumi/kubernetes/core/v1/service";

export interface WebDeploymentArgs {
    namespaceName?: pulumi.Input<string>;
    appLabels?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
    pgHost: pulumi.Input<string>;
    pgUser: pulumi.Input<string>;
    pgPassword: pulumi.Input<string>;
}

export class WebDeployment extends pulumi.ComponentResource {


    public readonly serviceURL: pulumi.Output<string>;

    constructor(name: string, args: WebDeploymentArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:spring:WebDeployment", name, {}, opts);

        const namespaceName = args.namespaceName
        const appLabels = args.appLabels
        
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
            parent: this
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
                                    env: [{name: "SPRING_JPA_DBC", value: args.pgHost},
                                          {name: "SPRING_JPA_USER", value: args.pgHost},
                                          {name: "SPRING_JPA_PW", value: args.pgHost}]


                                
                                }
                            ],
                        }
                    }
                },
            },
             {
                parent: this
            }
        );
        this.serviceURL = service.status.loadBalancer.ingress[0].ip
        
        this.registerOutputs({
            serviceURL: service.status.loadBalancer.ingress[0].ip,
        }) 
    }
    
}

