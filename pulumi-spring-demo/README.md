## build and push the image to docker

1. Build using Cloud Native Buildpacks
```bash
./mvnw spring-boot:build-image
```
2. TAG THE image
```bash
docker tag docker.io/library/pulumi-demo:0.0.1-SNAPSHOT docker.io/ellinj/pulumi-demo:0.0.1-SNAPSHOT
```
3. Push the image
```bash
docker push docker.io/ellinj/pulumi-demo:0.0.1-SNAPSHOT
```