// Loaded by Jest (setupFilesAfterEnv) for every test file: replaces Prisma and bcrypt, resets mocks between tests.
import { resetMocks } from "./helpers";

jest.mock("../config/prisma", () => ({ prisma: jest.requireActual("./helpers").mockPrisma }));
jest.mock("bcrypt", () => ({
  compare: jest.fn(async (password: string) => password === "Admin@123"),
  hash: jest.fn(async () => "hashed-password"),
}));

beforeEach(resetMocks);
