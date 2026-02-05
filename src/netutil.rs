use std::net::Ipv4Addr;

pub fn is_tailscale_ipv4(ip: &str) -> bool {
    let Ok(addr) = ip.parse::<Ipv4Addr>() else {
        return false;
    };
    let oct = addr.octets();
    oct[0] == 100 && (64..=127).contains(&oct[1])
}

pub fn filter_tailscale_ipv4s(input: &str) -> Vec<String> {
    input
        .split_whitespace()
        .filter(|ip| is_tailscale_ipv4(ip))
        .map(|s| s.to_string())
        .collect()
}

// SSH_CONNECTION format: "<client_ip> <client_port> <server_ip> <server_port>"
// We want the server-side IP since that's the local bind candidate.
pub fn tailscale_server_ip_from_ssh_connection(input: &str) -> Option<String> {
    let mut parts = input.split_whitespace();
    let _client_ip = parts.next()?;
    let _client_port = parts.next()?;
    let server_ip = parts.next()?;
    if is_tailscale_ipv4(server_ip) {
        Some(server_ip.to_string())
    } else {
        None
    }
}
