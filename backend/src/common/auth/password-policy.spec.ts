import { PASSWORD_MAX_BYTES, passwordProblem } from "./password-policy";

describe("password policy", () => {
  it("accepts a twelve character phrase, with spaces and any characters", () => {
    expect(passwordProblem("blue tractor sings")).toBeNull();
    expect(passwordProblem("twelve chars!")).toBeNull();
    expect(passwordProblem("Okuhepa okuhwa ngoo")).toBeNull();
  });

  it("refuses under twelve characters, counting characters and not bytes", () => {
    expect(passwordProblem("short1")).toMatch(/at least 12/);
    expect(passwordProblem("elevenchars")).toMatch(/at least 12/);
    expect(passwordProblem("日本語のパスワードです。お願い")).toBeNull();
  });

  it("refuses more than bcrypt reads, saying so, instead of cutting it silently", () => {
    const phrase = "river stone lantern ";
    const longest = phrase.repeat(4).slice(0, PASSWORD_MAX_BYTES);
    expect(passwordProblem(`${longest}x`)).toMatch(/too long/);
    expect(passwordProblem(longest)).toBeNull();
  });

  it("refuses blanks, repeats and very common words", () => {
    expect(passwordProblem(" ".repeat(14))).toMatch(/only spaces|few different/);
    expect(passwordProblem("aaaaaaaaaaaaaa")).toMatch(/few different/);
    expect(passwordProblem("MyPassword2026!!")).toMatch(/common word/);
    expect(passwordProblem("qwertyuiop1234")).toMatch(/common word/);
  });

  it("does not demand upper case, digits or symbols", () => {
    expect(passwordProblem("only lower case words here")).toBeNull();
  });

  it("refuses a non-string", () => {
    expect(passwordProblem(undefined)).toMatch(/Enter a password/);
  });
});
