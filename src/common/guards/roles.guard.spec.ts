import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = jest.fn();
  const controller = jest.fn();
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;
  let request: { user?: { rol?: { nombre?: string } } };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    guard = new RolesGuard(reflector as unknown as Reflector);
    request = {};
  });

  function context(): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('allows the role resolved onto the authenticated request', () => {
    request.user = { rol: { nombre: 'ADMIN' } };
    expect(guard.canActivate(context())).toBe(true);
  });

  it('denies missing users and users with a different role', () => {
    expect(guard.canActivate(context())).toBe(false);
    request.user = { rol: { nombre: 'CONSULTOR' } };
    expect(guard.canActivate(context())).toBe(false);
  });

  it('allows authenticated routes without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });
});
