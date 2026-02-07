pub fn filter_tailscale_ipv4s(input: &str) -> Vec<String> {
    input
        .split_whitespace()
        .filter(|ip| ip.starts_with("100."))
        .map(|s| s.to_string())
        .collect()
}

