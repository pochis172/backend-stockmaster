
import {
  ConflictException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Rol } from '../database/entities/rol.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { CrearRegistroDto } from './dto/crear-registro.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: CrearRegistroDto) {
    const existing = await this.usuariosRepository.findOne({
      where: { correo: dto.correo },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const role = await this.rolesRepository.findOne({
      where: { nombre: 'CONSULTOR' },
    });
    if (!role) {
      throw new InternalServerErrorException(
        'El rol de registro predeterminado no está configurado',
      );
    }

    const password = await bcrypt.hash(dto.password, 12);
    let user: Usuario;
    try {
      user = await this.usuariosRepository.save(
        this.usuariosRepository.create({
          nombre: dto.nombre,
          correo: dto.correo,
          password,
          rol: role,
        }),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }

    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: role.nombre,
      fechaCreacion: user.fechaCreacion,
    };
  }

  async login(correo: string, password: string) {
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('usuario.correo = :correo', { correo })
      .getOne();

    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      mensaje: 'Inicio de sesión exitoso',
      access_token: accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
      },
    };
  }
}
