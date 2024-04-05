# Created the Dockerfile as requested even though CNB was
# used to produce the image.
FROM openjdk:17
VOLUME /tmp
COPY target/demo-0.0.3-SNAPSHOT.jar /app.jar
COPY wizexercise.txt /tmp/wizexercise.txt
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
