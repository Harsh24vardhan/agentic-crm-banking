import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidName, isValidUsername, isValidEmail, isValidPhone, validateRmInput } from "./validators.js";

describe("isValidName", () => {
  test("rejects a name containing digits", () => {
    assert.equal(isValidName("John123"), false);
  });

  test("rejects an all-digit string", () => {
    assert.equal(isValidName("123456"), false);
  });

  test("accepts a name with an apostrophe", () => {
    assert.equal(isValidName("Mary O'Brien"), true);
  });

  test("accepts a hyphenated name", () => {
    assert.equal(isValidName("Jean-Pierre"), true);
  });

  test("rejects an empty or whitespace-only name", () => {
    assert.equal(isValidName(""), false);
    assert.equal(isValidName("   "), false);
  });
});

describe("isValidUsername", () => {
  test("accepts letters, numbers, underscore, period", () => {
    assert.equal(isValidUsername("sarah_c.1"), true);
  });

  test("rejects a too-short username", () => {
    assert.equal(isValidUsername("ab"), false);
  });

  test("rejects spaces", () => {
    assert.equal(isValidUsername("sarah connor"), false);
  });
});

describe("isValidEmail", () => {
  test("accepts a normal email", () => {
    assert.equal(isValidEmail("test@example.com"), true);
  });

  test("rejects a malformed email", () => {
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("missing@domain"), false);
  });
});

describe("isValidPhone", () => {
  test("accepts a well-formatted Indian phone number", () => {
    assert.equal(isValidPhone("+91 98765 43210"), true);
  });

  test("accepts an unspaced Indian phone number", () => {
    assert.equal(isValidPhone("+919876543210"), true);
  });

  test("rejects a number missing the +91 prefix", () => {
    assert.equal(isValidPhone("9876543210"), false);
  });

  test("rejects a wrong-length number", () => {
    assert.equal(isValidPhone("+91 987 654"), false);
  });
});

describe("validateRmInput", () => {
  test("flags every field on a fully-invalid submission", () => {
    const { valid, errors } = validateRmInput({
      name: "John123",
      username: "ab",
      password: "123",
      email: "bad",
      phone: "12345"
    });
    assert.equal(valid, false);
    assert.equal(Object.keys(errors).length, 5);
  });

  test("accepts a fully-valid submission", () => {
    const { valid, errors } = validateRmInput({
      name: "Priya Sharma",
      username: "priya_s",
      password: "secret123",
      email: "priya@bank.com",
      phone: "+91 98765 43210"
    });
    assert.equal(valid, true);
    assert.deepEqual(errors, {});
  });

  test("reports only the fields that are actually invalid", () => {
    const { valid, errors } = validateRmInput({
      name: "Priya Sharma",
      username: "priya_s",
      password: "secret123",
      email: "priya@bank.com",
      phone: "not-a-phone"
    });
    assert.equal(valid, false);
    assert.deepEqual(Object.keys(errors), ["phone"]);
  });
});
