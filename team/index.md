---
title: Team
nav:
  order: 3
  tooltip: About our team
---

# <i class="fas fa-users"></i>Team

Our lab is made up of a highly engaged and collaborative team of researchers. We recognize that diverse teams do better research. We foster an environment where team members are treated equally, and where we respect and admire our differences.

{% include section.html %}

{%
  include list.html
  data="members"
  component="portrait"
  filters="role: pi"
%}
{%
  include list.html
  data="members"
  component="portrait"
  filters="role: pa"
%}
{%
  include list.html
  data="members"
  component="portrait"
  filters="role: phd"
%}
{%
  include list.html
  data="members"
  component="portrait"
  filters="role: master"
%}
{%
  include list.html
  data="members"
  component="portrait"
  filters="role: undergrad"
%}

{% include section.html %}

# <i class="fas fa-users"></i>Collaborations

{%
  include list.html
  data="members"
  component="portrait"
  filters="role: pc"
%}

{:.center}

{% include section.html background="images/atcg.jpg" dark=true%}
{:.center}
“The scientist is not a person who gives the right answers, he’s one who asks the right questions.”

{% include section.html %}

## Join

We’re always on the lookout for new and unique perspectives. We want to push the frontier of bioinformatics and train the next generation of bioinformatic scientists.

We are always seeking talented and passionate people to join our team, from summer students to postdocs to staff scientists, short-term and long-term. If you are interested in joining us, please send an email and include your Lattes CV.

{% include link.html type="external" link="https://google.com/" text="Join the Team" icon="" style="button" %}
{:.center}

{% include section.html %}

## Funding

Our work is made possible by funding from several organizations.
{:.center}

{%
  include gallery.html

  image1="images/fapesp.jpg"
  link1="https://fapesp.br/"
  tooltip1="FAPESP - Fundação de Amparo à Pesquisa do Estado de São Paulo"

  image2="images/cnpq.png"
  link2="https://www.gov.br/cnpq/pt-br"
  tooltip2="CNPq - Conselho Nacional de Desenvolvimento Científico e Tecnológico"

  image3="images/capes.jpeg"
  link3="https://www.gov.br/capes/pt-br"
  tooltip3="CAPES - Coordenação de Aperfeiçoamento de Pessoal de Nível Superior"

  image4="images/faep.png"
  link4="https://www.faep.org.br/"
  tooltip4="FAEP - Fundação de Amparo ao Ensino e Pesquisa"
%}
