import { CommonValidators } from '@atoms/validators/common.validators';
import { ValidatorTestUtils, AtomTestDataGenerators } from '../../utils/atoms-test-helpers';

describe('CommonValidators', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUID v4 format', () => {
      const validUUIDs = [
        '123e4567-e89b-42d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'A987FBC9-4BED-4078-8F07-9141BA07C9F3', // uppercase
      ];

      validUUIDs.forEach((uuid) => {
        expect(CommonValidators.isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456', // too short
        'not-a-uuid',
        '123e4567-xxxx-12d3-a456-426614174000', // invalid characters
        '',
        'g47ac10b-58cc-4372-a567-0e02b2c3d479', // invalid hex
        '550e8400-e29b-51d4-a716-446655440000', // wrong version (5 not 4)
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(CommonValidators.isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@example.co.uk',
        'name@subdomain.example.org',
        '123@numbers.com',
        'user_name@example.com',
        'FirstName.LastName@company.com',
      ];

      validEmails.forEach((email) => {
        expect(CommonValidators.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com', // space
        'user@example',
        'user@.com',
        'user..name@example.com',
        '',
        'user@',
        'user.@example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(CommonValidators.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URL formats', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com',
        'https://subdomain.example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://example.com/path#hash',
        'http://localhost:3000',
        'https://api.example.com/v1/users',
      ];

      validUrls.forEach((url) => {
        expect(CommonValidators.isValidUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // only http/https
        'example.com', // no protocol
        'http://',
        'https://',
        'http://.',
        'http://..',
        'http://../',
        'http://?',
        'http://??',
        'http://??/',
        'http://#',
        'http://##',
        'http://##/',
        '//example.com',
        '',
      ];

      invalidUrls.forEach((url) => {
        expect(CommonValidators.isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('isNonEmptyString', () => {
    it('should accept non-empty strings', () => {
      expect(CommonValidators.isNonEmptyString('hello')).toBe(true);
      expect(CommonValidators.isNonEmptyString('  hello  ')).toBe(true);
      expect(CommonValidators.isNonEmptyString('123')).toBe(true);
      expect(CommonValidators.isNonEmptyString('!@#$%')).toBe(true);
    });

    it('should reject empty or whitespace-only strings', () => {
      expect(CommonValidators.isNonEmptyString('')).toBe(false);
      expect(CommonValidators.isNonEmptyString(' ')).toBe(false);
      expect(CommonValidators.isNonEmptyString('  ')).toBe(false);
      expect(CommonValidators.isNonEmptyString('\t')).toBe(false);
      expect(CommonValidators.isNonEmptyString('\n')).toBe(false);
      expect(CommonValidators.isNonEmptyString('\r\n')).toBe(false);
    });

    it('should handle type checking', () => {
      expect(CommonValidators.isNonEmptyString(null as any)).toBe(false);
      expect(CommonValidators.isNonEmptyString(undefined as any)).toBe(false);
      expect(CommonValidators.isNonEmptyString(123 as any)).toBe(false);
      expect(CommonValidators.isNonEmptyString({} as any)).toBe(false);
      expect(CommonValidators.isNonEmptyString([] as any)).toBe(false);
    });
  });

  describe('isValidLinearIdentifier', () => {
    it('should validate correct Linear identifier formats', () => {
      const validIdentifiers = ['ENG-123', 'PROJ-1', 'BUG-9999', 'FEAT-42', 'A-1', 'ZZZZZ-999999'];

      validIdentifiers.forEach((id) => {
        expect(CommonValidators.isValidLinearIdentifier(id)).toBe(true);
      });
    });

    it('should reject invalid Linear identifier formats', () => {
      const invalidIdentifiers = [
        'eng-123', // lowercase
        'ENG123', // no hyphen
        'ENG-', // no number
        '-123', // no prefix
        'ENG-ABC', // letters instead of numbers
        '123-ENG', // reversed
        'ENG-0', // zero is technically valid
        '',
        'ENG--123',
        'E NG-123',
      ];

      invalidIdentifiers.forEach((id) => {
        expect(CommonValidators.isValidLinearIdentifier(id)).toBe(false);
      });
    });
  });

  describe('isInRange', () => {
    it('should validate numbers within range', () => {
      expect(CommonValidators.isInRange(5, 0, 10)).toBe(true);
      expect(CommonValidators.isInRange(0, 0, 10)).toBe(true);
      expect(CommonValidators.isInRange(10, 0, 10)).toBe(true);
      expect(CommonValidators.isInRange(-5, -10, 0)).toBe(true);
      expect(CommonValidators.isInRange(0.5, 0, 1)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(CommonValidators.isInRange(11, 0, 10)).toBe(false);
      expect(CommonValidators.isInRange(-1, 0, 10)).toBe(false);
      expect(CommonValidators.isInRange(0, 1, 10)).toBe(false);
    });

    it('should handle non-finite numbers', () => {
      expect(CommonValidators.isInRange(NaN, 0, 10)).toBe(false);
      expect(CommonValidators.isInRange(Infinity, 0, 10)).toBe(false);
      expect(CommonValidators.isInRange(-Infinity, 0, 10)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should validate non-empty arrays', () => {
      expect(CommonValidators.isNonEmptyArray([1])).toBe(true);
      expect(CommonValidators.isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(CommonValidators.isNonEmptyArray(['a'])).toBe(true);
      expect(CommonValidators.isNonEmptyArray([null])).toBe(true);
      expect(CommonValidators.isNonEmptyArray([undefined])).toBe(true);
    });

    it('should reject empty arrays and non-arrays', () => {
      expect(CommonValidators.isNonEmptyArray([])).toBe(false);
      expect(CommonValidators.isNonEmptyArray(null as any)).toBe(false);
      expect(CommonValidators.isNonEmptyArray(undefined as any)).toBe(false);
      expect(CommonValidators.isNonEmptyArray({} as any)).toBe(false);
      expect(CommonValidators.isNonEmptyArray('array' as any)).toBe(false);
      expect(CommonValidators.isNonEmptyArray(123 as any)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate valid dates', () => {
      expect(CommonValidators.isValidDate(new Date())).toBe(true);
      expect(CommonValidators.isValidDate('2024-01-01')).toBe(true);
      expect(CommonValidators.isValidDate('2024-01-01T12:00:00Z')).toBe(true);
      expect(CommonValidators.isValidDate(new Date('2024-12-31'))).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(CommonValidators.isValidDate('invalid-date')).toBe(false);
      expect(CommonValidators.isValidDate('2024-13-01')).toBe(false); // invalid month
      expect(CommonValidators.isValidDate('2024-01-32')).toBe(false); // invalid day
      expect(CommonValidators.isValidDate(new Date('invalid'))).toBe(false);
      expect(CommonValidators.isValidDate(NaN as any)).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should validate future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      expect(CommonValidators.isFutureDate(tomorrow)).toBe(true);
      expect(CommonValidators.isFutureDate(nextYear)).toBe(true);
      expect(CommonValidators.isFutureDate('2099-01-01')).toBe(true);
    });

    it('should reject past and current dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(CommonValidators.isFutureDate(yesterday)).toBe(false);
      expect(CommonValidators.isFutureDate(new Date())).toBe(false);
      expect(CommonValidators.isFutureDate('2020-01-01')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(CommonValidators.isFutureDate('invalid')).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should validate past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);

      expect(CommonValidators.isPastDate(yesterday)).toBe(true);
      expect(CommonValidators.isPastDate(lastYear)).toBe(true);
      expect(CommonValidators.isPastDate('2020-01-01')).toBe(true);
    });

    it('should reject future and current dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(CommonValidators.isPastDate(tomorrow)).toBe(false);
      expect(CommonValidators.isPastDate(new Date())).toBe(false);
      expect(CommonValidators.isPastDate('2099-01-01')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(CommonValidators.isPastDate('invalid')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('should validate correct hex color codes', () => {
      const validColors = [
        '#000000',
        '#FFFFFF',
        '#FF0000',
        '#00FF00',
        '#0000FF',
        '#abc123',
        '#ABC123',
        '#000', // short form
        '#FFF',
        '#F0F',
      ];

      validColors.forEach((color) => {
        expect(CommonValidators.isValidHexColor(color)).toBe(true);
      });
    });

    it('should reject invalid hex color codes', () => {
      const invalidColors = [
        '000000', // no hash
        '#GGGGGG', // invalid hex
        '#12345', // wrong length
        '#1234567', // wrong length
        'red',
        'rgb(255,0,0)',
        '',
        '#',
        '##000000',
      ];

      invalidColors.forEach((color) => {
        expect(CommonValidators.isValidHexColor(color)).toBe(false);
      });
    });
  });

  describe('isValidSlug', () => {
    it('should validate correct slug formats', () => {
      const validSlugs = [
        'hello-world',
        'test-slug-123',
        'my-awesome-post',
        'a',
        '123',
        'slug',
        'multi-word-slug-example',
      ];

      validSlugs.forEach((slug) => {
        expect(CommonValidators.isValidSlug(slug)).toBe(true);
      });
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Hello-World', // uppercase
        'hello world', // space
        'hello_world', // underscore
        'hello--world', // double hyphen
        '-hello', // leading hyphen
        'hello-', // trailing hyphen
        '',
        'hello.world',
        'hello/world',
      ];

      invalidSlugs.forEach((slug) => {
        expect(CommonValidators.isValidSlug(slug)).toBe(false);
      });
    });
  });

  describe('isValidLength', () => {
    it('should validate string length within bounds', () => {
      expect(CommonValidators.isValidLength('hello', 1, 10)).toBe(true);
      expect(CommonValidators.isValidLength('', 0, 10)).toBe(true);
      expect(CommonValidators.isValidLength('exactly10c', 10, 10)).toBe(true);
    });

    it('should reject strings outside length bounds', () => {
      expect(CommonValidators.isValidLength('hello', 10, 20)).toBe(false);
      expect(CommonValidators.isValidLength('hello world', 1, 5)).toBe(false);
      expect(CommonValidators.isValidLength('', 1, 10)).toBe(false);
    });
  });

  describe('isValidTeamKey', () => {
    it('should validate correct team key formats', () => {
      const validKeys = ['EN', 'ENG', 'PROJ', 'INFRA', 'AB', 'ZZZZZ'];

      validKeys.forEach((key) => {
        expect(CommonValidators.isValidTeamKey(key)).toBe(true);
      });
    });

    it('should reject invalid team key formats', () => {
      const invalidKeys = [
        'E', // too short
        'TOOLONG', // too long
        'eng', // lowercase
        'En', // mixed case
        '123', // numbers
        'E-N', // special chars
        '',
        'A B',
        'A1',
      ];

      invalidKeys.forEach((key) => {
        expect(CommonValidators.isValidTeamKey(key)).toBe(false);
      });
    });
  });
});
