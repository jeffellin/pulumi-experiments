import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface FluxDeploymentArgs {
    provider?: pulumi.Input<string>;
}

export class FluxDeployment extends pulumi.ComponentResource {

    constructor(name: string, args: FluxDeploymentArgs, opts: pulumi.ComponentResourceOptions) {
        super("pkg:index:FluxDeployment", name, {}, opts);

        // Use Helm to install the Flux  controller
        const ingressController = new k8s.helm.v3.Release("fluxcd", {
            chart: "flux2",
            namespace: "default",
            repositoryOpts: {
                repo: "https://fluxcd-community.github.io/helm-charts",
            },
            version: "2.12.2",
        },{parent:this, provider: opts.provider});

    }

}

