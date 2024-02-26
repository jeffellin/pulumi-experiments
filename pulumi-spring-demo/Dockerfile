# Created the Dockerfile as requested even though CNB was
# used to produce the image.
FROM openjdk:17
VOLUME /tmp
COPY target/pulumi-demo-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]