import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { BadRequestException } from '@nestjs/common';
import defaultConfig from 'src/config/default.config';
import * as bcrypt from 'bcrypt';

const mockUserDocument = (overrides = {}) => ({
  toJSON: () => ({
    id: 'user-id-123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    credits: { balance: 500, reserved: 0, lifetime_used: 0 },
    ...overrides,
  }),
  password: 'hashed-password',
  ...overrides,
});

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockDefaultConfig = { freeCreditsOnSignup: 500 };

describe('UserService', () => {
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: defaultConfig.KEY, useValue: mockDefaultConfig },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('returns a user when found', async () => {
      const userDocument = mockUserDocument();
      mockUserModel.findOne.mockResolvedValue(userDocument);

      const result = await userService.findOne('test@example.com', 'default');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com', provider: 'default' });
      expect(result).toBe(userDocument);
    });

    it('returns null when user is not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await userService.findOne('unknown@example.com', 'default');

      expect(result).toBeNull();
    });

    it('defaults provider to default when not provided', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await userService.findOne('test@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com', provider: 'default' });
    });
  });

  describe('findById', () => {
    it('returns a user when found', async () => {
      const userDocument = mockUserDocument();
      mockUserModel.findById.mockResolvedValue(userDocument);

      const result = await userService.findById('user-id-123');

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-id-123');
      expect(result).toBe(userDocument);
    });

    it('returns null when user is not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await userService.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a user and grants free credits', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const userDocument = mockUserDocument();
      mockUserModel.create.mockResolvedValue(userDocument);

      const result = await userService.create({ email: 'new@example.com', password: 'Password1!' });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: { balance: 500, reserved: 0, lifetime_used: 0 },
        }),
      );
      expect(result.credits.balance).toBe(500);
    });

    it('throws BadRequestException when user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUserDocument());

      await expect(
        userService.create({ email: 'test@example.com', password: 'Password1!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('defaults provider to default', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUserDocument());

      await userService.create({ email: 'new@example.com', password: 'Password1!' });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'default' }),
      );
    });

    it('uses provided provider for OAuth users', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUserDocument());

      await userService.create({ email: 'oauth@example.com', provider: 'google' });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      );
    });
  });

  describe('isValidPassword', () => {
    it('returns true when password matches', async () => {
      const plainPassword = 'Password1!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const result = await userService.isValidPassword(hashedPassword, plainPassword);

      expect(result).toBe(true);
    });

    it('returns false when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 10);

      const result = await userService.isValidPassword(hashedPassword, 'WrongPassword1!');

      expect(result).toBe(false);
    });
  });

  describe('userObject', () => {
    it('returns a correctly shaped user object', () => {
      const userDocument = mockUserDocument() as any;

      const result = userService.userObject(userDocument);

      expect(result).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        credits: { balance: 500, reserved: 0, lifetime_used: 0 },
      });
    });

    it('does not expose password', () => {
      const userDocument = mockUserDocument() as any;

      const result = userService.userObject(userDocument);

      expect(result).not.toHaveProperty('password');
    });
  });
});
