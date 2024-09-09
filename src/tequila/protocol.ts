type TequilaResult = Record<string, string>;

class TequilaServerError extends Error {
  constructor(code: number, body: string) {
    super(`TequilaServerError: ${code} ${body}`);
  }
}

export default class Protocol {
  /** The app-provided service name (like TequilaService in [mod_tequila-config]) */
  service: string = "";
  client: string = "node-passport-tequila";

  /** The host name of the Tequila server */
  tequila_host: string = "tequila.epfl.ch";

  /** The port number of the Tequila server (HTTP/S is mandatory) */
  tequila_port: string = "443";

  tequila_createrequest_path: string = "/cgi-bin/tequila/createrequest";
  tequila_requestauth_path: string = "/cgi-bin/tequila/auth"; // Not /requestauth, as erroneously stated in [Lecommandeur-WritingClients]:
  tequila_fetchattributes_path: string = "/cgi-bin/tequila/fetchattributes";
  tequila_logout_path: string = "/cgi-bin/tequila/logout";

  /** A filter expression (e.g. "username=~.") (like TequilaAllowIf in [mod_tequila-config]) */
  require?: string;

  /** A list of user identity fields to fetch, e.g. ['name', 'firstname'] (like TequilaRequest in [mod_tequila-config]) */
  request?: string[];
  allows?: string;

  wantright?: string[];
  wantrole?: string[];

  constructor() {}

  /**
   * @param afterAuthRedirectUrl The location that Tequila should tell the browser to go back to, once authentication succeeds
   */
  async createRequest(afterAuthRedirectUrl: string) {
    let teq_options: Record<string, string> = {
      client: this.client,
      urlaccess: afterAuthRedirectUrl,
      service: this.service || "Document " + afterAuthRedirectUrl,
      mode_auth_check: "1",
    };
    if (this.require) teq_options.require = this.require;
    if (this.request) teq_options.request = this.request.join(",");
    if (this.allows) teq_options.allows = this.allows;
    if (this.wantright && this.wantright.length > 0)
      teq_options.wantright = this.wantright.join("+");
    if (this.wantrole && this.wantrole.length > 0)
      teq_options.wantrole = this.wantrole.join("+");

    return await this.teqRequest(this.tequila_createrequest_path, teq_options);
  }

  requestAuthRedirectUrl(key: string): string {
    let portFragment =
      this.tequila_port !== "443" ? `:${this.tequila_port}` : "";
    return `https://${this.tequila_host}${portFragment}${this.tequila_requestauth_path}?requestkey=${key}`;
  }

  /**
   * Do the fetchattributes Tequila request.
   *
   * Ensure that the response contains a status=ok line (otherwise, synthesize a TequilaServerError)
   *
   * @param key The Tequila key (passed as key= URI parameter when redirected back from Tequila)
   * @param authCheck The Tequila auth_check (passed as auth_check= URI parameter when redirected back from Tequila)
   */
  async fetchAttributes(
    key: string,
    authCheck: string,
  ): Promise<TequilaResult> {
    return await this.teqRequest(this.tequila_fetchattributes_path, {
      key,
      auth_check: authCheck,
    });
  }

  private async teqRequest(
    path: string,
    teqOptions: Record<string, string>,
  ): Promise<TequilaResult> {
    let teq_post_payload = dict2txt(teqOptions);

    const res = await fetch(
      `https://${this.tequila_host}:${this.tequila_port}/${path}`,
      {
        method: "POST",
        body: teq_post_payload,
        cache: "no-cache",
      },
    );

    if (res.status !== 200) {
      const message = await res.text();
      throw new TequilaServerError(res.status, message);
    }

    return txt2dict(await res.text());
  }
}

function dict2txt(dict: Record<string, string>, opt_operator = "="): string {
  return Object.keys(dict)
    .map(function (k) {
      return k + opt_operator + dict[k] + "\r\n";
    })
    .join("")
    .slice(0, -2);
}

function txt2dict(
  txt: string,
  opt_operator: string = "=",
): Record<string, string> {
  const dict: Record<string, string> = {};
  txt.split("\n").forEach(function (line) {
    line = line.replace(/\r$/, "");
    const sepIndex = line.indexOf(opt_operator);
    if (sepIndex == -1) {
      if (line.length) console.log("Skipping bogus line: " + line);
      return;
    }
    const k = line.slice(0, sepIndex);
    const v = line.slice(sepIndex + opt_operator.length);
    dict[k] = v;
  });
  return dict;
}
