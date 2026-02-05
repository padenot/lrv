use anyhow::Result;
use std::io::Read;

fn main() -> Result<()> {
    // Read full stdin
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;

    // Parse using library API
    let diff = lrv::diff::parse_diff(&buf)?;

    // Print JSON
    println!("{}", serde_json::to_string_pretty(&diff)?);
    Ok(())
}
