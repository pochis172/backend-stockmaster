import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockMasterSchema1760720000000
  implements MigrationInterface
{
  name = 'CreateStockMasterSchema1760720000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id int NOT NULL AUTO_INCREMENT,
        nombre varchar(30) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_roles_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id int NOT NULL AUTO_INCREMENT,
        nombre varchar(100) NOT NULL,
        correo varchar(150) NOT NULL,
        password varchar(255) NOT NULL,
        rol_id int NOT NULL,
        fechaCreacion datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_usuarios_correo (correo),
        KEY IDX_usuarios_rol_id (rol_id),
        CONSTRAINT FK_usuarios_rol FOREIGN KEY (rol_id)
          REFERENCES roles (id) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id int NOT NULL AUTO_INCREMENT,
        nombre varchar(100) NOT NULL,
        descripcion text NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_categorias_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id int NOT NULL AUTO_INCREMENT,
        nombre varchar(150) NOT NULL,
        descripcion text NULL,
        precio decimal(12,2) NOT NULL,
        stock_actual int NOT NULL DEFAULT 0,
        categoria_id int NOT NULL,
        fechaCreacion datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        fechaActualizacion datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_productos_categoria_id (categoria_id),
        CONSTRAINT FK_productos_categoria FOREIGN KEY (categoria_id)
          REFERENCES categorias (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT CHK_productos_stock_no_negativo CHECK (stock_actual >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id int NOT NULL AUTO_INCREMENT,
        tipo enum('entrada','salida') NOT NULL,
        cantidad int NOT NULL,
        fecha datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        producto_id int NOT NULL,
        usuario_id int NOT NULL,
        PRIMARY KEY (id),
        KEY IDX_movimientos_producto_id (producto_id),
        KEY IDX_movimientos_usuario_id (usuario_id),
        CONSTRAINT FK_movimientos_producto FOREIGN KEY (producto_id)
          REFERENCES productos (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_movimientos_usuario FOREIGN KEY (usuario_id)
          REFERENCES usuarios (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT CHK_movimientos_cantidad_positiva CHECK (cantidad > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO roles (nombre)
      VALUES ('ADMIN'), ('BODEGUERO'), ('CONSULTOR')
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Esta migración inicial es irreversible para evitar eliminar datos',
    );
  }
}
