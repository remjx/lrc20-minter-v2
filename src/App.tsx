import { useEffect, useRef, useState } from "react";
import "./App.css";

/* Types for global vars from /public/scripts */
interface Inscription {
  data: string;
  mediaType: string;
  metaDataTemplate: null;
  toAddress: string;
}
interface Lock {
  address: string;
  blocksToLock: number;
  satoshisToLock: number;
}
interface Payer {
  walletAddress: string;
}
declare const lockscribeTx: (
  inscription: Inscription,
  lock: Lock,
  payer: Payer
) => {
  bsvtx: any;
  utxos: {
    satoshis: number;
    script: string;
    txid: string;
    vout: number;
  }[];
};
declare const broadcast: any;
declare const setupWallet: any;
declare const restoreWallet: any;
declare const backupWallet: any;
declare const getWalletBalance: any;
// declare const unlockCoins: any;

function generateDeployInscription(opts: {
  tick: string;
  max: number;
  lim: number;
  blocks: number;
  sats: number;
}) {
  Object.values(opts).forEach((value) => {
    if (!value) throw new Error("Missing opt");
  });
  return JSON.stringify({
    p: "lrc-20",
    op: "deploy",
    tick: opts.tick,
    max: opts.max,
    lim: opts.lim,
    blocks: opts.blocks,
    sats: opts.sats,
  });
}

function generateMintInscription(opts: { tickid: string; amt: number }) {
  Object.values(opts).forEach((value) => {
    if (!value) throw new Error("Missing opt");
  });
  return JSON.stringify({
    p: "lrc-20",
    op: "mint",
    id: opts.tickid,
    amt: opts.amt,
  });
}

export default function App() {
  const [connecting, setConnecting] = useState(false);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [op, setOp] = useState<"deploy" | "mint">("mint");
  const [status, setStatus] = useState<"idle" | "submitting">(
    "idle"
  );
  // const [unlocking, setUnlocking] = useState(false)
  const fileUploadRef = useRef<HTMLInputElement>(null);
  async function handleRestoreWallet() {
    if (fileUploadRef.current) {
      fileUploadRef.current.click();
    }
  }
  async function handleNewWallet() {
    setConnecting(true);
    try {
      await setupWallet();
      const addr = localStorage.getItem("walletAddress")
      if (typeof addr !== 'string') {
        throw new Error("Error connecting wallet");
      }
      setConnectedWalletAddress(addr);
    } catch (e) {
      alert(e);
    }
    setConnecting(false);
  }
  async function handleDisconnect() {
    try {
      // eslint-disable-next-line no-restricted-globals
      const hasBackup = confirm("have you backed up your keys?");
      if (hasBackup) {
        localStorage.clear();
        setConnectedWalletAddress("");
      }
    } catch (e) {
      alert(e);
    }
  }
  useEffect(() => {
    const addr = localStorage.getItem("walletAddress")
    if (typeof addr === 'string') {
      setConnectedWalletAddress(addr);
      handleRefreshBalance();
    }
  }, [connectedWalletAddress]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    const formData = new FormData(e.currentTarget);
    e.preventDefault();
    setStatus("submitting");
    try {
      const bsv = await handleRefreshBalance()
      const satsAmt = Number(formData.get("sats"));
      if (bsv * 100_000_000 < satsAmt) {
        throw new Error("Insufficient balance");
      }
      const blocks = Number(formData.get("blocks"));
      if (!blocks) throw new Error("Invalid blocks to lock.");
      let inscriptionData: string;
      switch (op) {
        case "deploy": {
          inscriptionData = generateDeployInscription({
            tick: String(formData.get("tick")),
            max: Number(formData.get("max")),
            lim: Number(formData.get("lim")),
            blocks,
            sats: Number(formData.get("sats")),
          });
          break;
        }
        case "mint": {
          inscriptionData = generateMintInscription({
            tickid: String(formData.get("tickid")),
            amt: Number(formData.get("amt")),
          });
          break;
        }
        default: {
          throw new Error("Invalid op.");
        }
      }
      const ordAddress = localStorage.getItem("ownerAddress");
      const bsvAddress = localStorage.getItem("walletAddress");
      if (!ordAddress || !bsvAddress)
        throw new Error("Error getting addresses.");
      const inscription: Inscription = {
        data: inscriptionData,
        mediaType: "application/json",
        metaDataTemplate: null,
        toAddress: ordAddress,
      };
      const lock: Lock = {
        address: bsvAddress,
        blocksToLock: blocks,
        satoshisToLock: parseInt((satsAmt).toString(), 10),
      };
      const payer: Payer = {
        walletAddress: bsvAddress,
      };
      const rawTx = await lockscribeTx(inscription, lock, payer);
      const t = await broadcast(rawTx);
      alert('successfully broadcasted tx ' + t)
    } catch (e) {
      console.error(e);
      alert(e);
    } finally {
      setStatus("idle");
    }
  };

  async function handleRefreshBalance() {
    const sats = await getWalletBalance();
    const bsv = sats / 100_000_000;
    setBalance(bsv);
    return bsv;
  }

  // const handleUnlock: React.FormEventHandler<HTMLFormElement> = async (e) => {
  //   e.preventDefault()
  //   setUnlocking(true)
  //   try {
  //     const formData = new FormData(e.currentTarget);
  //     const txid = String(formData.get("txid"))
  //     const walletAddress = localStorage.getItem("walletAddress")
  //     const walletKey = localStorage.getItem("walletKey")
  //     const rawTx = await unlockCoins(walletKey, walletAddress, txid)
  //     const unlockResult = await broadcast(rawTx)
  //     alert(unlockResult)
  //   } catch (e) {
  //     console.error(e)
  //     alert(e);
  //   } finally {
  //     setUnlocking(false)
  //   }
  // }

  return (
    <div>
      <h1 style={{ marginBottom: "2px" }}>
        LRC-20 minter (shrdlu2 version)
        <div style={{ display: "inline-block", marginLeft: "12px" }}>
          <a href="https://github.com/remjx/lrc20-minter-v2">
            <img src="/lrc20-minter-v2/github.png" alt="source code" height={32} width={32} />
          </a>
        </div>
      </h1>
      <div>
        Follow{" "}
        <a
          href="https://x.com/lockinalswallet"
          target="_blank"
          rel="noreferrer"
        >
          @lockinalswallet
        </a>
      </div>
      <div style={{ marginBottom: "16px" }}>
          warning: use at your own risk.
      </div>

      {!connectedWalletAddress ? (
        <>
          <button
            disabled={connecting}
            onClick={handleNewWallet}
            style={{ marginRight: "8px" }}
          >
            new shua wallet
          </button>
          <button disabled={connecting} onClick={handleRestoreWallet}>
            restore shua wallet
          </button>
          <input
            ref={fileUploadRef}
            type="file"
            id="uploadFile"
            accept=".json"
            hidden
            onChange={(e: any) => {
              const files = e.target.files;
              const file = files[0];
              const reader = new FileReader();
              setConnecting(true);
              reader.onload = (e) => {
                try {
                  const json = JSON.parse(e?.target?.result as string);
                  restoreWallet(json.ordPk, json.payPk);
                  setConnectedWalletAddress(String(localStorage.getItem("walletAddress")));
                } catch (e) {
                  console.log(e);
                  alert(e);
                  setConnectedWalletAddress("");
                  throw new Error("Error restoring wallet.");
                }
              };
              setConnecting(false);
              reader.readAsText(file);
            }}
          />
        </>
      ) : (
        <>
          <div>connected wallet address: <a href={`https://whatsonchain.com/address/${connectedWalletAddress}`} target="_blank" rel="noreferrer">{connectedWalletAddress}</a></div>
          <div style={{ marginBottom: "8px" }}>
            balance: {balance} BSV{" "}
            <button onClick={handleRefreshBalance}>refresh balance</button>
          </div>
          <button
            disabled={connecting}
            onClick={handleDisconnect}
            style={{ marginRight: "8px" }}
          >
            disconnect wallet
          </button>
          <button disabled={connecting} onClick={backupWallet}>
            back up wallet
          </button>
          <br />
          <br />
          <div style={{ marginBottom: "12px" }}>
            <label>op:</label>
            <input
              type="radio"
              name="op"
              checked={op === "deploy"}
              onChange={() => setOp("deploy")}
            />
            <label>deploy</label>
            <input
              type="radio"
              name="op"
              checked={op === "mint"}
              onChange={() => setOp("mint")}
            />
            <label>mint</label>
          </div>
          <form onSubmit={handleSubmit}>
            {op === "deploy" && (
              <>
                <div>
                  <label>tick: </label>
                  <input
                    name="tick"
                    type="text"
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>max: </label>
                  <input
                    name="max"
                    type="number"
                    min={0}
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>lim: </label>
                  <input
                    name="lim"
                    type="number"
                    min={0}
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>blocks: </label>
                  <input
                    name="blocks"
                    type="number"
                    min={1}
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>sats: </label>
                  <input
                    name="sats"
                    type="number"
                    min={1}
                    disabled={status === "submitting"}
                  />
                </div>
              </>
            )}
            {op === "mint" && (
              <>
                <div>
                  <label>tick id (txid_vout): </label>
                  <input
                    name="tickid"
                    type="text"
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>amt: </label>
                  <input
                    name="amt"
                    min={0}
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>blocks: </label>
                  <input
                    name="blocks"
                    type="number"
                    min={1}
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label>sats: </label>
                  <input
                    name="sats"
                    type="number"
                    min={1}
                    disabled={status === "submitting"}
                  />
                </div>
              </>
            )}
            <br />
            <button disabled={status === "submitting"}>{status === 'submitting' ? 'submitting' : 'submit'}</button>
          </form>
          <br/>
          <br/>
          {/* <div>unlock:</div>
          <form onSubmit={handleUnlock}>
              <input placeholder="txid" name="txid" type="text" disabled={unlocking}/>
            <button type="submit" disabled={unlocking}>unlock</button>
          </form>
          <br/> */}
        </>
      )}
    </div>
  );
}
