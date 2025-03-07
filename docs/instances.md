# Explique instances

This document documents the various prod instances of Explique and their
specificities.

<table>
	<tr>
		<th>URL</th>
		<th>Purpose</th>
		<th>Convex deployment</th>
		<th>Next.js server infrastructure</th>
		<th>Repository / CD source</th>
		<th>Auth</th>
		<th>Course automatically joined when creating an account</th>
	</tr>
	<tr>
		<td><a href='https://epfl.explique.ai/'>https://epfl.explique.ai/</a></td>
		<td>EPFL prod</td>
		<td><a href='https://dashboard.convex.dev/t/explique/explique-epfl-ch/giant-walrus-505'>giant-walrus-505</a></td>
		<td>Vercel</td>
		<td><a href='https://github.com/Nicolapps/expliqueepflch'>https://github.com/Nicolapps/expliqueepflch</a></td>
		<td>Google, restricted by default to <a href='http://epfl.ch'>epfl.ch</a> accounts</td>
		<td>None</td>
	</tr>
	<tr>
		<td><strong><a href='https://explique.epfl.ch/'>https://explique.epfl.ch/</a></strong></td>
		<td>Redirects to <a href='epfl.explique.ai'>epfl.explique.ai</a></td>
		<td>—</td>
		<td>EPFL</td>
		<td><a href='https://gitlab.epfl.ch/ic-it/explique'>https://gitlab.epfl.ch/ic-it/explique</a></td>
		<td>—</td>
		<td>—</td>
	</tr>
	<tr>
		<td><strong><a href='https://stanford.explique.ai/'>https://stanford.explique.ai/</a></strong></td>
		<td>Stanford prod</td>
		<td><a href='https://dashboard.convex.dev/t/explique/stanford/tremendous-gerbil-874'>tremendous-gerbil-874</a></td>
		<td>Vercel</td>
		<td><a href='https://github.com/Nicolapps/explique-stanford'>https://github.com/Nicolapps/explique-stanford</a></td>
		<td>Google, restricted by default to <a href='stanford.edu'>stanford.edu</a> accounts</td>
		<td>CS161</td>
	</tr>
	<tr>
		<td><strong><a href='http://cs250.epfl.ch'>https://cs250.epfl.ch</a></strong></td>
		<td>EPFL CS-250 (2023–2024)</td>
		<td><a href='https://dashboard.convex.dev/t/explique/cs250-prod/warmhearted-owl-155'>warmhearted-owl-155</a></td>
		<td>EPFL</td>
		<td><a href='https://gitlab.epfl.ch/ic-it/no-name-ai'>https://gitlab.epfl.ch/ic-it/no-name-ai</a></td>
		<td>Tequila</td>
		<td>— (codebase predates the support of multiple courses per instance; users must be allowlisted to access the platform)</td>
	</tr>
	<tr>
		<td><strong><a href='https://demo.explique.ai'>https://demo.explique.ai</a></strong></td>
		<td><a href='https://x.com/AlgoSvensson/status/1830577508565000445'>Public demo for X</a></td>
		<td><a href='https://dashboard.convex.dev/t/explique/demo/shocking-kiwi-621'>shocking-kiwi-621</a></td>
		<td>Vercel</td>
		<td><strong><a href='https://github.com/expliqueai/explique'>https://github.com/expliqueai/explique</a></strong> (main repo)</td>
		<td>Google (any account)</td>
		<td>DEMO-101</td>
	</tr>
</table>
