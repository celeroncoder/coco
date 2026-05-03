import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SKILLS_DIR } from "./config.ts";

export type LocalSkill = {
  name: string;
  description?: string;
  path: string;
};

export async function scanSkills(): Promise<LocalSkill[]> {
  if (!existsSync(SKILLS_DIR)) return [];
  const entries = await readdir(SKILLS_DIR);
  const skills: LocalSkill[] = [];
  for (const name of entries) {
    const path = join(SKILLS_DIR, name);
    let s;
    try {
      s = await stat(path);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;

    let description: string | undefined;
    const skillFile = join(path, "SKILL.md");
    if (existsSync(skillFile)) {
      try {
        const text = await readFile(skillFile, "utf8");
        description = parseDescription(text);
      } catch {}
    }
    skills.push({ name, description, path });
  }
  return skills;
}

function parseDescription(md: string): string | undefined {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const desc = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (desc) return desc[1].trim();
  }
  const firstPara = md.split("\n").find((l) => l.trim() && !l.startsWith("#"));
  return firstPara?.trim();
}

export async function readSkillContent(skillPath: string): Promise<string | null> {
  const skillFile = join(skillPath, "SKILL.md");
  if (!existsSync(skillFile)) return null;
  try {
    return await readFile(skillFile, "utf8");
  } catch {
    return null;
  }
}
