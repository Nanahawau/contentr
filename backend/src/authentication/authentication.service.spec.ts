import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import jwtConfig from 'src/config/jwt.config';

const mockUserObject = {
  id: 'user-id-123',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  credits: { balance: 500, reserved: 0, lifetime_used: 0 },
};

const mockUserDocument = {
  password: 'hashed-password',
};

const mockUserService = {
  findOne: jest.fn(),
  findById: jest.fn(),
  isValidPassword: jest.fn(),
  userObject: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

const mockJwtConfig = {
  secret: 'test-secret',
  refreshSecret: 'test-refresh-secret',
  accessTokenExpiry: '1h',
  refreshTokenExpiry: '7d',
};

describe('AuthenticationService', () => {
  let authenticationService: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
      ],
    }).compile();

    authenticationService = module.get<AuthenticationService>(AuthenticationService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('delegates to UserService.create and returns the user object', async () => {
      mockUserService.create.mockResolvedValue(mockUserObject);

      const result = await authenticationService.register({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(mockUserService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password1!',
      });
      expect(result).toBe(mockUserObject);
    });
  });

  describe('login', () => {
    it('returns tokens and user on valid credentials', async () => {
      mockUserService.findOne.mockResolvedValue(mockUserDocument);
      mockUserService.isValidPassword.mockResolvedValue(true);
      mockUserService.userObject.mockReturnValue(mockUserObject);
      mockJwtService.sign.mockReturnValue('signed-token');

      const result = await authenticationService.login({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result).toMatchObject({
        user: mockUserObject,
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      await expect(
        authenticationService.login({ email: 'unknown@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      mockUserService.findOne.mockResolvedValue(mockUserDocument);
      mockUserService.isValidPassword.mockResolvedValue(false);

      await expect(
        authenticationService.login({ email: 'test@example.com', password: 'WrongPassword1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('returns new tokens when refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-id-123', email: 'test@example.com' });
      mockUserService.findById.mockResolvedValue(mockUserDocument);
      mockUserService.userObject.mockReturnValue(mockUserObject);
      mockJwtService.sign.mockReturnValue('new-signed-token');

      const result = await authenticationService.refresh('valid-refresh-token');

      expect(result).toMatchObject({
        user: mockUserObject,
        access_token: 'new-signed-token',
        refresh_token: 'new-signed-token',
      });
    });

    it('throws UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('invalid token'); });

      await expect(
        authenticationService.refresh('invalid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user no longer exists', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'deleted-user-id', email: 'test@example.com' });
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        authenticationService.refresh('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
