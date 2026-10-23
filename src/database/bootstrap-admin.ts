import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} debe configurarse para crear el administrador`);
  }
  return value;
}

async function bootstrapAdmin() {
  const nombre = requiredEnvironmentValue('INITIAL_ADMIN_NAME');
  const correo = requiredEnvironmentValue('INITIAL_ADMIN_EMAIL');
  const password = requiredEnvironmentValue('INITIAL_ADMIN_PASSWORD');

  if (nombre.length > 100 || correo.length > 150) {
    throw new Error('El nombre o el correo supera el límite permitido');
  }
  if (Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD debe tener entre 12 y 72 bytes UTF-8',
    );
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const roles = manager.getRepository(Rol);
      const usuarios = manager.getRepository(Usuario);
      const adminRole = await roles.findOne({
        where: { nombre: 'ADMIN' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!adminRole) {
        throw new Error('El rol ADMIN no existe; ejecuta primero las migraciones');
      }

      const adminCount = await usuarios.count({
        where: { rol: { id: adminRole.id } },
      });
      if (adminCount > 0) {
        throw new Error('Ya existe un administrador; no se creó otra cuenta');
      }

      const existingUser = await usuarios.findOne({ where: { correo } });
      if (existingUser) {
        throw new Error(
          'El correo ya pertenece a una cuenta; no se modificó ningún usuario',
        );
      }

      await usuarios.save(
        usuarios.create({
          nombre,
          correo,
          password: await bcrypt.hash(password, 12),
          rol: adminRole,
        }),
      );
    });
  } finally {
    await dataSource.destroy();
  }
}

bootstrapAdmin()
  .then(() => {
    console.log('Se creó la cuenta inicial de administrador.');
  })
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? `No se creó el administrador: ${error.message}`
        : 'No se creó el administrador por un error inesperado.',
    );
    process.exitCode = 1;
  });
