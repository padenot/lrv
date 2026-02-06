use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserConfig {
    #[serde(default = "default_color_scheme")]
    pub color_scheme: String,
    #[serde(default = "default_font")]
    pub font: String,
    #[serde(default = "default_split_view")]
    pub split_view: bool,
    #[serde(default = "default_auto_close_tab")]
    pub auto_close_tab: bool,
}

fn default_color_scheme() -> String {
    "vs-dark".to_string()
}

fn default_font() -> String {
    "JetBrains Mono".to_string()
}

fn default_split_view() -> bool {
    true
}

fn default_auto_close_tab() -> bool {
    true
}

impl Default for UserConfig {
    fn default() -> Self {
        Self {
            color_scheme: default_color_scheme(),
            font: default_font(),
            split_view: default_split_view(),
            auto_close_tab: default_auto_close_tab(),
        }
    }
}

fn get_config_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .context("Could not determine config directory")?
        .join("lrv");

    fs::create_dir_all(&config_dir)
        .context("Failed to create config directory")?;

    Ok(config_dir.join("config.toml"))
}

pub fn load_config() -> Result<UserConfig> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(UserConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .context("Failed to read config file")?;

    let config: UserConfig = toml::from_str(&content)
        .context("Failed to parse config file")?;

    Ok(config)
}

pub fn save_config(config: &UserConfig) -> Result<()> {
    let config_path = get_config_path()?;

    let content = toml::to_string_pretty(config)
        .context("Failed to serialize config")?;

    fs::write(&config_path, content)
        .context("Failed to write config file")?;

    Ok(())
}
