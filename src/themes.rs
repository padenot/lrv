use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Deserialize)]
struct VsCodeTheme {
    name: Option<String>,
    #[serde(rename = "type")]
    theme_type: Option<String>,
    #[serde(default)]
    colors: serde_json::Map<String, serde_json::Value>,
    #[serde(rename = "tokenColors", default)]
    token_colors: Vec<VsCodeTokenColor>,
}

#[derive(Deserialize)]
struct VsCodeTokenColor {
    #[serde(default)]
    scope: VsCodeScope,
    settings: VsCodeTokenSettings,
}

#[derive(Deserialize, Default)]
#[serde(untagged)]
enum VsCodeScope {
    #[default]
    None,
    Single(String),
    Multiple(Vec<String>),
}

#[derive(Deserialize)]
struct VsCodeTokenSettings {
    foreground: Option<String>,
    #[serde(rename = "fontStyle")]
    font_style: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct UserTheme {
    pub id: String,
    pub name: String,
    pub accent_hex: String,
    pub data: MonacoThemeData,
}

#[derive(Serialize, Clone)]
pub struct MonacoThemeData {
    pub base: String,
    pub inherit: bool,
    pub rules: Vec<MonacoRule>,
    pub colors: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Clone)]
pub struct MonacoRule {
    pub token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub foreground: Option<String>,
    #[serde(rename = "fontStyle", skip_serializing_if = "Option::is_none")]
    pub font_style: Option<String>,
}

fn accent_from_colors(colors: &serde_json::Map<String, serde_json::Value>) -> String {
    let candidates = [
        "activityBar.activeBorder",
        "button.background",
        "focusBorder",
        "progressBar.background",
        "editor.selectionBackground",
    ];
    candidates
        .iter()
        .find_map(|key| {
            colors
                .get(*key)
                .and_then(|v| v.as_str())
                .filter(|s| s.starts_with('#') && s.len() >= 7)
                .map(|s| s[..7].to_string())
        })
        .unwrap_or_else(|| "#007acc".to_string())
}

fn convert(id: String, vsc: VsCodeTheme) -> UserTheme {
    let name = vsc.name.unwrap_or_else(|| id.clone());
    let base = if vsc.theme_type.as_deref() == Some("light") {
        "vs"
    } else {
        "vs-dark"
    };
    let accent_hex = accent_from_colors(&vsc.colors);

    let mut rules = Vec::new();
    for tc in vsc.token_colors {
        let scopes: Vec<String> = match tc.scope {
            VsCodeScope::None => continue,
            VsCodeScope::Single(s) => s
                .split(',')
                .map(|p| p.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            VsCodeScope::Multiple(v) => v,
        };
        let foreground = tc
            .settings
            .foreground
            .as_deref()
            .map(|f| f.trim_start_matches('#').to_uppercase());
        let font_style = tc.settings.font_style;
        for scope in scopes {
            rules.push(MonacoRule {
                token: scope,
                foreground: foreground.clone(),
                font_style: font_style.clone(),
            });
        }
    }

    UserTheme {
        id,
        name,
        accent_hex,
        data: MonacoThemeData {
            base: base.to_string(),
            inherit: true,
            rules,
            colors: vsc.colors,
        },
    }
}

pub fn load_user_themes() -> Vec<UserTheme> {
    let themes_dir = match dirs::config_dir().map(|d| d.join("lrv").join("themes")) {
        Some(d) if d.is_dir() => d,
        _ => return vec![],
    };

    let entries = match fs::read_dir(&themes_dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    entries
        .flatten()
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("json"))
        .filter_map(|e| {
            let path = e.path();
            let id = path.file_stem()?.to_str()?.to_string();
            let content = fs::read_to_string(&path).ok()?;
            match serde_json::from_str::<VsCodeTheme>(&content) {
                Ok(vsc) => Some(convert(id, vsc)),
                Err(err) => {
                    eprintln!("lrv: skipping theme {:?}: {}", path, err);
                    None
                }
            }
        })
        .collect()
}
