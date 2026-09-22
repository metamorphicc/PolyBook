export const GAMMA_HOST = "https://gamma-api.polymarket.com";

export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ];

/** ERC1155 outcome shares. Selling needs the exchange approved as an operator. */
export const CONDITIONAL_TOKENS_ABI = [
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
];

export const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  
