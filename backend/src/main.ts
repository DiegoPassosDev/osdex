import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(helmet());
  }

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const frontendUrls = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const corsOrigin =
    !isProduction || frontendUrls.length === 0
      ? true
      : frontendUrls.length === 1
        ? frontendUrls[0]
        : frontendUrls;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(3001, '0.0.0.0');
}

bootstrap();
