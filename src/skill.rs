use std::path::PathBuf;

pub const EMBEDDED_SKILL: &str = include_str!("skill.md");

pub fn skill_install_paths() -> Vec<PathBuf> {
    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };

    [
        home.join(".claude").join("skills").join("lrv"),
        home.join(".codex").join("skills").join("lrv"),
        home.join(".agents").join("skills").join("lrv"),
    ]
    .into_iter()
    .map(|dir| dir.join("SKILL.md"))
    .collect()
}

pub fn all_skills_installed() -> bool {
    let paths = skill_install_paths();
    !paths.is_empty()
        && paths.into_iter().all(|path| {
            std::fs::read_to_string(path).is_ok_and(|installed| installed == EMBEDDED_SKILL)
        })
}
