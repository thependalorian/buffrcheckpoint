# Demo seeds

Sample organisations, sites, hosts, forms, kiosks and a demo platform-support user. For local and staging databases only. Never run these against production: the first customers must see an empty platform, and a demo organisation in production is exactly what these create.

The configuration seeds one level up (`0001` to `0008`, `0010`, `0014`) hold the lists the product needs (type definitions, permissions, domains) and do belong in every environment.

`0012_demo_branding_buffr_analytics.sql` was removed when custom branding was retired. `0009` and `0018` no longer create or touch branding.
