import {
  IsEmail,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  @MaxLength(150)
  correo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolId: number;
}
