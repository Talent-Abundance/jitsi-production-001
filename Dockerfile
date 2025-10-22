# Dockerfile
FROM jitsi/web:stable

# Copy your customizations
COPY ./jitsi-meet/css/all.css /usr/share/jitsi-meet/css/all.css
COPY ./jitsi-meet/images/logo.png /usr/share/jitsi-meet/images/logo.png
COPY ./jitsi-meet/interface_config.js /usr/share/jitsi-meet/interface_config.js
# COPY ./jitsi-meet/libs/custom-face-api.js /usr/share/jitsi-meet/libs/custom-face-api.js
# COPY ./jitsi-meet/models /usr/share/jitsi-meet/models
