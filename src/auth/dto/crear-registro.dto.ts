import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearRegistroDto {
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
}
