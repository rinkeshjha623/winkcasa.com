---
layout: default
title: WinkCasa – Global News & Industry Updates
---

{% assign top = site.posts.first %}

<!-- TOP STORY -->
<section class="home-hero">
  <span class="hero-label">Top Story</span>

  {% if top.image %}
    <img class="hero-image" src="{{ top.image }}" alt="{{ top.title }}">
  {% endif %}

  <h1>
    <a href="{{ top.url }}">{{ top.title }}</a>
  </h1>

  <p>{{ top.excerpt | strip_html | truncate: 180 }}</p>
</section>

<!-- MAIN GRID -->
<section class="home-grid">

  <!-- LEFT COLUMN -->
  <div class="home-left">
    <h2>Latest News</h2>

    <div class="news-card-grid">
      {% for post in site.posts offset:1 limit:6 %}
        <article class="news-card">

          {% if post.image %}
            <img src="{{ post.image }}" alt="{{ post.title }}">
          {% endif %}

         <div class="card-meta">

  {% if post.live %}
    <span class="badge-live">LIVE</span>
  {% endif %}

  <span class="badge category-{{ post.category }}">
    {{ post.category | replace: "-", " " | upcase }}
  </span>

</div>

<h3>
  <a href="{{ post.url }}">{{ post.title }}</a>
</h3>

          <p>{{ post.excerpt | strip_html | truncate: 120 }}</p>

          <span class="news-meta">
            {{ post.date | date: "%B %d, %Y" }}
          </span>

        </article>
      {% endfor %}
    </div>
  </div>

  <!-- RIGHT COLUMN -->
  <aside class="home-right">
    <h2>Sections</h2>

    <ul class="section-list">
      <li><a href="/categories/top-companies/">Top Companies</a></li>
      <li><a href="/categories/ai-trends/">AI Trends</a></li>
      <li><a href="/categories/cybersecurity/">Cybersecurity</a></li>
      <li><a href="/categories/cloud-saas/">Cloud & SaaS</a></li>
      <li><a href="/categories/payment-solutions/">Payments</a></li>
      <li><a href="/categories/crypto-updates/">Crypto</a></li>
      <li><a href="/categories/gaming-industry/">Gaming</a></li>
      <li><a href="/categories/live-streaming/">Live</a></li>
    </ul>

    <div class="write-box">
      <h3>Write for WinkCasa</h3>
      <p>Founders, analysts & industry experts welcome.</p>
      <a class="btn" href="/write-for-us/">Write for Us</a>
    </div>
  </aside>

</section>
