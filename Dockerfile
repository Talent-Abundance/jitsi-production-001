FROM jitsi/web:stable

# Dockerfile
FROM jitsi/web:stable

COPY ./css/all.css /usr/share/jitsi-meet/css/all.css
COPY ./images/logo.png /usr/share/jitsi-meet/images/logo.png
COPY ./interface_config.js /usr/share/jitsi-meet/interface_config.js
COPY ./libs/custom-face-api.js /usr/share/jitsi-meet/libs/custom-face-api.js
COPY ./models /usr/share/jitsi-meet/models