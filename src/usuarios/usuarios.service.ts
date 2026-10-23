import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Movimiento } from '../database/entities/movimiento.entity';
import { Rol } from '../database/entities/rol.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepo: Repository<Rol>,
    @InjectRepository(Movimiento)
    private readonly movimientosRepo: Repository<Movimiento>,
  ) {}

  async create(dto: CrearUsuarioDto) {
    await this.ensureEmailAvailable(dto.correo);
    const role = await this.findRole(dto.rolId);
    const password = await bcrypt.hash(dto.password, 12);
    const usuario = await this.usuariosRepo.save(
      this.usuariosRepo.create({
        nombre: dto.nombre,
        correo: dto.correo,
        password,
        rol: role,
      }),
    );
    return this.toPublicUser(usuario);
  }

  async findAll() {
    const users = await this.usuariosRepo.find({
      relations: { rol: true },
      order: { id: 'ASC' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number) {
    const user = await this.usuariosRepo.findOne({
      where: { id },
      relations: { rol: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toPublicUser(user);
  }

  async update(id: number, dto: ActualizarUsuarioDto) {
    const user = await this.usuariosRepo.findOne({
      where: { id },
      relations: { rol: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.correo && dto.correo !== user.correo) {
      await this.ensureEmailAvailable(dto.correo);
      user.correo = dto.correo;
    }
    if (dto.nombre !== undefined) {
      user.nombre = dto.nombre;
    }
    if (dto.password !== undefined) {
      user.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.rolId !== undefined && dto.rolId !== user.rol.id) {
      const role = await this.findRole(dto.rolId);
      if (user.rol.nombre === 'ADMIN' && role.nombre !== 'ADMIN') {
        const admins = await this.usuariosRepo.count({
          where: { rol: { nombre: 'ADMIN' } },
        });
        if (admins <= 1) {
          throw new ConflictException(
            'No se puede cambiar el rol del último administrador',
          );
        }
      }
      user.rol = role;
    }

    const updated = await this.usuariosRepo.save(user);
    return this.toPublicUser(updated);
  }

  async remove(id: number, authenticatedUserId: number) {
    if (id === authenticatedUserId) {
      throw new BadRequestException(
        'No se puede eliminar la cuenta autenticada',
      );
    }

    const user = await this.usuariosRepo.findOne({
      where: { id },
      relations: { rol: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.rol.nombre === 'ADMIN') {
      const admins = await this.usuariosRepo.count({
        where: { rol: { nombre: 'ADMIN' } },
      });
      if (admins <= 1) {
        throw new ConflictException(
          'No se puede eliminar el último administrador',
        );
      }
    }

    const movements = await this.movimientosRepo.count({
      where: { usuario: { id } },
    });
    if (movements > 0) {
      throw new ConflictException(
        'No se puede eliminar un usuario con movimientos registrados',
      );
    }

    await this.usuariosRepo.remove(user);
    return { mensaje: 'Usuario eliminado correctamente' };
  }

  private async findRole(id: number) {
    const role = await this.rolesRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  private async ensureEmailAvailable(correo: string) {
    const existing = await this.usuariosRepo.findOne({ where: { correo } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }
  }

  private toPublicUser(user: Usuario) {
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: { id: user.rol.id, nombre: user.rol.nombre },
      fechaCreacion: user.fechaCreacion,
    };
  }
}
