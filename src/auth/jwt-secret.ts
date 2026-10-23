import { ConfigService } from '@nestjs/config';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET debe estar configurado');
  }

  if (
    config.get<string>('NODE_ENV') === 'production' &&
    secret.length < 32
  ) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  }

  return secret;
}
