#[test]
fn test_filter_tailscale_ipv4s() {
    let s = "127.0.0.1 192.168.1.20 100.64.12.3 100.120.5.6";
    let ips = lrv::netutil::filter_tailscale_ipv4s(s);
    assert_eq!(ips, vec!["100.64.12.3", "100.120.5.6"]);
}

#[test]
fn test_filter_tailscale_ipv4s_strict_cidr() {
    let s = "100.63.0.1 100.64.0.1 100.127.255.254 100.128.0.1";
    let ips = lrv::netutil::filter_tailscale_ipv4s(s);
    assert_eq!(ips, vec!["100.64.0.1", "100.127.255.254"]);
}

#[test]
fn test_tailscale_server_ip_from_ssh_connection() {
    let v = "100.101.102.103 55555 100.88.77.66 22";
    let ip = lrv::netutil::tailscale_server_ip_from_ssh_connection(v);
    assert_eq!(ip.as_deref(), Some("100.88.77.66"));
}

#[test]
fn test_tailscale_server_ip_from_ssh_connection_non_tailscale() {
    let v = "192.168.1.3 55555 192.168.1.10 22";
    let ip = lrv::netutil::tailscale_server_ip_from_ssh_connection(v);
    assert_eq!(ip, None);
}
