// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token20 is ERC20 {

    constructor() ERC20("Token20", "T20") {

        _mint(msg.sender, 10000000000000000000000000000000000000000);

    }

}