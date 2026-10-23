
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { Usuario } from '../database/entities/usuario.entity';
import { Rol } from '../database/entities/rol.entity';
import { Movimiento } from '../database/entities/movimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol, Movimiento])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
