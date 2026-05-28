import "reflect-metadata";
import * as cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true
  });

  // Serve the uploads directory statically
  const express = require('express');
  const path = require('path');
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
}

void bootstrap();
