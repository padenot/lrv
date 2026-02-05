/// Test default config values
#[test]
fn test_config_defaults() {
    let config = lrv::config::UserConfig::default();

    assert_eq!(config.color_scheme, "vs-dark");
    assert_eq!(config.font, "JetBrains Mono");
    assert!(config.split_view);
    assert!(config.auto_close_tab);
}

/// Test config serialization/deserialization
#[test]
fn test_config_serde() {
    let config = lrv::config::UserConfig {
        color_scheme: "github-dark".to_string(),
        font: "Monaco".to_string(),
        split_view: false,
        auto_close_tab: false,
        stacked_view: false,
    };

    // Serialize to TOML
    let toml_str = toml::to_string(&config).unwrap();
    assert!(toml_str.contains("github-dark"));
    assert!(toml_str.contains("Monaco"));

    // Deserialize back
    let deserialized: lrv::config::UserConfig = toml::from_str(&toml_str).unwrap();
    assert_eq!(deserialized.color_scheme, "github-dark");
    assert_eq!(deserialized.font, "Monaco");
    assert!(!deserialized.split_view);
    assert!(!deserialized.auto_close_tab);
}

/// Test config with missing fields (should use defaults)
#[test]
fn test_config_missing_fields() {
    let toml_str = r#"
        color_scheme = "github-light"
    "#;

    let config: lrv::config::UserConfig = toml::from_str(toml_str).unwrap();
    assert_eq!(config.color_scheme, "github-light");
    // Should use defaults for missing fields
    assert_eq!(config.font, "JetBrains Mono");
    assert!(config.split_view);
    assert!(config.auto_close_tab);
}
