import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { resolveCorsOrigin } from './common/cors.util';

// TLS est terminé une seule fois, par nginx (voir nginx/nginx.conf).
// Le backend ne parle qu'en clair, en interne, au conteneur nginx : il ne
// doit donc jamais charger de certificat lui-même (sinon on se retrouve
// avec deux certificats à valider côté navigateur : un pour nginx, un pour
// le backend).
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Dossier de stockage des avatars uploadés ; servi statiquement en dessous
  // pour que /uploads/avatars/xxx.jpg soit accessible directement (via
  // nginx: https://localhost:3000/api/uploads/avatars/xxx.jpg).
  const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // retire tout champ non déclaré dans le DTO
      forbidNonWhitelisted: true, // rejette la requête si un champ inconnu est envoyé
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port} (derrière nginx en HTTPS)`);
}

bootstrap();
