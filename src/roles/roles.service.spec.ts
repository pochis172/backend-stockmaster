import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import { Rol } from '../database/entities/rol.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let rolesRepo: { find: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    rolesRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Rol), useValue: rolesRepo },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('lists persisted roles in stable order', async () => {
    await service.findAll();
    expect(rolesRepo.find).toHaveBeenCalledWith({
      order: { nombre: 'ASC' },
    });
  });

  it('returns not found for an unknown role id', async () => {
    await expect(service.findOne(999)).rejects.toMatchObject({ status: 404 });
  });
});
