#[test]
fn test_filter_tailscale_ipv4s() {
    let s = "127.0.0.1 192.168.1.20 100.64.12.3 100.120.5.6";
    let ips = lrv::netutil::filter_tailscale_ipv4s(s);
    assert_eq!(ips, vec!["100.64.12.3", "100.120.5.6"]);
}
