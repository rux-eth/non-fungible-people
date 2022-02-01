// SPDX-License-Identifier: MIT
// Author: The Non-Fungible People Project
// Developed by TheBigMort

pragma solidity ^0.8.7;

interface INFP {
    function mintPerson(uint256 numMints, uint256 edId) external payable;

    function claimPerson(
        uint256 nonce,
        uint256 edId,
        bytes memory signature
    ) external payable;

    function claimPrice() external view returns (uint256);

    function allStatus() external view returns (bool);

    function tokenURI(uint256 id) external view returns (string memory);

    function contractURI() external view returns (string memory);
}
