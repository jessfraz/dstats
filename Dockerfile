FROM node:alpine

COPY . /usr/src

WORKDIR /usr/src

RUN npm install && npm link

ENTRYPOINT [ "dstats" ]
